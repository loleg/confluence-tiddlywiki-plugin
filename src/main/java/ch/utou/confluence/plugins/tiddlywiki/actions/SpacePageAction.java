package ch.utou.confluence.plugins.tiddlywiki.actions;

import com.atlassian.confluence.core.DateFormatter;
import com.atlassian.confluence.importexport.DefaultExportContext;
import com.atlassian.confluence.importexport.ImportExportManager;
import com.atlassian.confluence.labels.Label;
import com.atlassian.confluence.pages.ContentTree;
import com.atlassian.confluence.renderer.radeox.macros.MacroUtils;
import com.atlassian.confluence.security.GateKeeper;
import com.atlassian.confluence.security.Permission;
import com.atlassian.confluence.security.PermissionManager;
import com.atlassian.confluence.security.SpacePermission;
import com.atlassian.confluence.spaces.actions.AbstractSpaceAction;
import com.atlassian.confluence.user.AuthenticatedUserThreadLocal;
import com.atlassian.confluence.util.longrunning.LongRunningTaskUtils;
import com.atlassian.confluence.util.velocity.VelocityUtils;
import com.atlassian.core.filters.ServletContextThreadLocal;
import com.atlassian.core.util.PairType;
import com.opensymphony.util.TextUtils;
import com.opensymphony.webwork.ServletActionContext;
import org.apache.commons.lang.StringUtils;
import org.springframework.web.context.ServletContextAware;
import com.atlassian.confluence.pages.PageManager;
import com.atlassian.confluence.pages.Page;
import com.atlassian.confluence.spaces.Space;
import com.atlassian.confluence.spaces.actions.SpaceAware;

import javax.servlet.ServletContext;

import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.ListIterator;
import java.util.Collections;
import java.util.Date;

public class SpacePageAction extends AbstractSpaceAction implements SpaceAware
{

    private ImportExportManager importExportManager;
    private List availableTypes = null;
    private String type;
    private String downloadPath;
    private boolean includeComments;
    private boolean backupAttachments;
    private List contentToBeExported = new ArrayList();
    private GateKeeper gateKeeper;
    private ContentTree contentTree;
    private ServletContext servletContext;
    private String contentOption;
    private boolean synchronous;
    
    private Space space;
    private PageManager pageManager;
    private List selectedPages;

    public String doDefault() throws Exception
    {
        includeComments = true;
        backupAttachments = true;
        return super.doDefault();
    }

    public void validate()
    {
        super.validate();

        if (!isSpaceAdminOrConfAdmin())
            addActionError(getText("export.space.validation.insufficient.privileges.export.all.content"));
    }
    
    public String getSpaceDescription()
    {
    	return getSpace().getDescription().getContent();
    }
    
    public List getVisiblePages()
    {
        if (selectedPages == null)
        {
        	// Select all pages in space,
        	// .. removing inaccessible (invisible) ones
            selectedPages = removeInvisibleContent(
            		// .. and only current versions (true) in space
            		pageManager.getPages(getSpace(), true));
        }
        return selectedPages;
    }
    
    public List getTopLevelPages()
    {
    	return removeInvisibleContent(
        		pageManager.getTopLevelPages(getSpace()));
    }
    
    protected List removeInvisibleContent(List content)
    {
        if (content != null)
        {
            ListIterator i = content.listIterator();
            while (i.hasNext())
            {
                Object object = i.next();
                if (!permissionManager.hasPermission(getRemoteUser(), Permission.VIEW, object)) {
                    i.remove();
                } else {
                	// Parse the page
                	if (((Page) object).getLastModifierName() == null)
                		((Page) object).setLastModifierName("Anonymous");
                }
            }
        }

        return content;
    }
    
    public String getTiddlyPages() {
    	String output = "";
    	String twServerInfo = getTiddlyServerInfo();
    	
    	for (ListIterator pp = getVisiblePages().listIterator(); pp.hasNext(); )
    	{
    		Page page = (Page) pp.next(); 
    		output += "<div" +
    			" title=\"" + page.getTitle() + "\"" +
    			" modifier=\"" + page.getLastModifierName() + "\"" +
        		" created=\"" + getTiddlyDate(page.getCreationDate()) + "\"" +
        		" modified=\"" + getTiddlyDate(page.getLastModificationDate()) + "\"" +
        		" wikiformat=\"confluence\"" + twServerInfo +
        		" server.page.revision=\"" + page.getVersion() + "\"" +
        		" server.page.id=\"" + page.getId() + "\"" +
        		" tags=\"" + getTiddlyLabels(page) + "\"" + ">" +
        		"<pre>" + page.getContent() + "</pre>"
        		+ "</div>\n";
    	}
    	return output;
    }
    
    private String getTiddlyServerInfo() {
    	String urlPath = getSpace().getUrlPath();
    	urlPath = urlPath.substring(0, urlPath.indexOf("/", 7));
    	return " server.host=\"" + urlPath + "\"" +
			   " server.workspace=\"" + getSpace().getKey() + "\"";
    }
    
    private String getTiddlyDate(Date date) {
    	SimpleDateFormat sdf = new SimpleDateFormat("yyyyMMddkkmm");
    	return sdf.format(date);
	}
    
    private String getTiddlyLabels(Page page) {
    	List labels = page.getLabelsForDisplay(AuthenticatedUserThreadLocal.getUser());
    	String ll = "";
    	for (ListIterator i = labels.listIterator(); i.hasNext(); )
        {
        	if (ll != "") ll += " ";
        	ll += ((Label)(i.next())).getDisplayTitle();
        }
        return ll;
    }

    public void setSpace(Space space)
    {
        this.space = space;
    }

    public boolean isSpaceRequired()
    {
        return true;
    }

    public boolean isViewPermissionRequired()
    {
        return true;
    }

    public Space getSpace()
    {
        return space;
    }

    public void setPageManager(PageManager pageManager)
    {
        this.pageManager = pageManager;
    }

    public String execute() throws Exception
    {
    	/*
        DefaultExportContext exportContext = new DefaultExportContext();
        exportContext.setScope(ImportExportManager.EXPORT_XML_SCOPE_SPACE);
        exportContext.setType(getType());
        exportContext.setExportComments(isIncludeComments());
        exportContext.setExportAttachments(isBackupAttachments());
        exportContext.setDateFormatter(getDateFormatter());
        exportContext.addWorkingEntity(getSpace());

        ExportSpaceLongRunningTask task = new ExportSpaceLongRunningTask(
                getRemoteUser(), ServletContextThreadLocal.getRequest().getContextPath(),
                exportContext, contentToBeExported, gateKeeper, importExportManager,
            permissionManager, type, contentOption);
        */

        if (true)
        {
        	// Default context
        	/*
    		Map contextMap = MacroUtils.defaultVelocityContext();
    		
    		contextMap.put("hello", "hello, world");
    		*/
    		// Render Velocity template
    		/*return VelocityUtils.getRenderedTemplate(
    				"/templates/tiddlywiki/tiddlypage.vm",
    				contextMap);*/
            return SUCCESS;
        }
        else
        {
            return ERROR;
        }
    }

    private boolean isSpaceAdminOrConfAdmin()
    {
        return permissionManager.hasPermission(AuthenticatedUserThreadLocal.getUser(), Permission.ADMINISTER, space) ||
               permissionManager.hasPermission(AuthenticatedUserThreadLocal.getUser(), Permission.ADMINISTER, PermissionManager.TARGET_APPLICATION);
    }

    public ServletContext getServletContext()
    {
        if (servletContext != null)
            return servletContext;
        else
            return ServletActionContext.getServletContext();
    }

    public ContentTree getContentTree()
    {
        if (contentTree == null)
            contentTree = importExportManager.getContentTree(getRemoteUser(), getSpace());

        return contentTree;
    }

    protected List getPermissionTypes()
    {
        List permissionTypes = super.getPermissionTypes();

        addPermissionTypeTo(SpacePermission.EXPORT_SPACE_PERMISSION, permissionTypes);

        //quick hack to avoid conflicting perm.s between editblog and editspace
        if (permissionTypes.contains(SpacePermission.CREATEEDIT_PAGE_PERMISSION))
            permissionTypes.remove(SpacePermission.CREATEEDIT_PAGE_PERMISSION);

        return permissionTypes;
    }

    public boolean isPermitted()
    {
        return super.isPermitted();
    }

    public boolean isBackupAttachments()
    {
        return backupAttachments;
    }

    public void setBackupAttachments(boolean backupAttachments)
    {
        this.backupAttachments = backupAttachments;
    }

    public void setGateKeeper(GateKeeper gateKeeper)
    {
        this.gateKeeper = gateKeeper;
    }

    public void setServletContext(ServletContext servletContext)
    {
        this.servletContext = servletContext;
    }

    public String getContentOption()
    {
        return contentOption;
    }

    public void setContentOption(String contentOption)
    {
        this.contentOption = contentOption;
    }

    public boolean isSynchronous()
    {
        return synchronous;
    }

    public void setSynchronous(boolean synchronous)
    {
        this.synchronous = synchronous;
    }
}
